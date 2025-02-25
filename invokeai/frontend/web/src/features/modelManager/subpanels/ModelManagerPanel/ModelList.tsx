import { Flex, Spinner } from '@chakra-ui/react';
import type { EntityState } from '@reduxjs/toolkit';
import { InvButton } from 'common/components/InvButton/InvButton';
import { InvButtonGroup } from 'common/components/InvButtonGroup/InvButtonGroup';
import { InvControl } from 'common/components/InvControl/InvControl';
import { InvInput } from 'common/components/InvInput/InvInput';
import { InvText } from 'common/components/InvText/wrapper';
import { forEach } from 'lodash-es';
import type { ChangeEvent, PropsWithChildren } from 'react';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ALL_BASE_MODELS } from 'services/api/constants';
import type {
  LoRAModelConfigEntity,
  MainModelConfigEntity,
} from 'services/api/endpoints/models';
import {
  useGetLoRAModelsQuery,
  useGetMainModelsQuery,
} from 'services/api/endpoints/models';

import ModelListItem from './ModelListItem';

type ModelListProps = {
  selectedModelId: string | undefined;
  setSelectedModelId: (name: string | undefined) => void;
};

type ModelFormat = 'all' | 'checkpoint' | 'diffusers';

type ModelType = 'main' | 'lora';

type CombinedModelFormat = ModelFormat | 'lora';

const ModelList = (props: ModelListProps) => {
  const { selectedModelId, setSelectedModelId } = props;
  const { t } = useTranslation();
  const [nameFilter, setNameFilter] = useState<string>('');
  const [modelFormatFilter, setModelFormatFilter] =
    useState<CombinedModelFormat>('all');

  const { filteredDiffusersModels, isLoadingDiffusersModels } =
    useGetMainModelsQuery(ALL_BASE_MODELS, {
      selectFromResult: ({ data, isLoading }) => ({
        filteredDiffusersModels: modelsFilter(
          data,
          'main',
          'diffusers',
          nameFilter
        ),
        isLoadingDiffusersModels: isLoading,
      }),
    });

  const { filteredCheckpointModels, isLoadingCheckpointModels } =
    useGetMainModelsQuery(ALL_BASE_MODELS, {
      selectFromResult: ({ data, isLoading }) => ({
        filteredCheckpointModels: modelsFilter(
          data,
          'main',
          'checkpoint',
          nameFilter
        ),
        isLoadingCheckpointModels: isLoading,
      }),
    });

  const { filteredLoraModels, isLoadingLoraModels } = useGetLoRAModelsQuery(
    undefined,
    {
      selectFromResult: ({ data, isLoading }) => ({
        filteredLoraModels: modelsFilter(data, 'lora', undefined, nameFilter),
        isLoadingLoraModels: isLoading,
      }),
    }
  );

  const handleSearchFilter = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setNameFilter(e.target.value);
  }, []);

  return (
    <Flex flexDirection="column" rowGap={4} width="50%" minWidth="50%">
      <Flex flexDirection="column" gap={4} paddingInlineEnd={4}>
        <InvButtonGroup>
          <InvButton
            onClick={setModelFormatFilter.bind(null, 'all')}
            isChecked={modelFormatFilter === 'all'}
            size="sm"
          >
            {t('modelManager.allModels')}
          </InvButton>
          <InvButton
            size="sm"
            onClick={setModelFormatFilter.bind(null, 'diffusers')}
            isChecked={modelFormatFilter === 'diffusers'}
          >
            {t('modelManager.diffusersModels')}
          </InvButton>
          <InvButton
            size="sm"
            onClick={setModelFormatFilter.bind(null, 'checkpoint')}
            isChecked={modelFormatFilter === 'checkpoint'}
          >
            {t('modelManager.checkpointModels')}
          </InvButton>
          <InvButton
            size="sm"
            onClick={setModelFormatFilter.bind(null, 'lora')}
            isChecked={modelFormatFilter === 'lora'}
          >
            {t('modelManager.loraModels')}
          </InvButton>
        </InvButtonGroup>

        <InvControl label={t('modelManager.search')}>
          <InvInput onChange={handleSearchFilter} />
        </InvControl>

        <Flex
          flexDirection="column"
          gap={4}
          maxHeight={window.innerHeight - 280}
          overflow="scroll"
        >
          {/* Diffusers List */}
          {isLoadingDiffusersModels && (
            <FetchingModelsLoader loadingMessage="Loading Diffusers..." />
          )}
          {['all', 'diffusers'].includes(modelFormatFilter) &&
            !isLoadingDiffusersModels &&
            filteredDiffusersModels.length > 0 && (
              <ModelListWrapper
                title="Diffusers"
                modelList={filteredDiffusersModels}
                selected={{ selectedModelId, setSelectedModelId }}
                key="diffusers"
              />
            )}
          {/* Checkpoints List */}
          {isLoadingCheckpointModels && (
            <FetchingModelsLoader loadingMessage="Loading Checkpoints..." />
          )}
          {['all', 'checkpoint'].includes(modelFormatFilter) &&
            !isLoadingCheckpointModels &&
            filteredCheckpointModels.length > 0 && (
              <ModelListWrapper
                title="Checkpoints"
                modelList={filteredCheckpointModels}
                selected={{ selectedModelId, setSelectedModelId }}
                key="checkpoints"
              />
            )}

          {/* LoRAs List */}
          {isLoadingLoraModels && (
            <FetchingModelsLoader loadingMessage="Loading LoRAs..." />
          )}
          {['all', 'lora'].includes(modelFormatFilter) &&
            !isLoadingLoraModels &&
            filteredLoraModels.length > 0 && (
              <ModelListWrapper
                title="LoRAs"
                modelList={filteredLoraModels}
                selected={{ selectedModelId, setSelectedModelId }}
                key="loras"
              />
            )}
        </Flex>
      </Flex>
    </Flex>
  );
};

export default memo(ModelList);

const modelsFilter = <T extends MainModelConfigEntity | LoRAModelConfigEntity>(
  data: EntityState<T, string> | undefined,
  model_type: ModelType,
  model_format: ModelFormat | undefined,
  nameFilter: string
) => {
  const filteredModels: T[] = [];
  forEach(data?.entities, (model) => {
    if (!model) {
      return;
    }

    const matchesFilter = model.model_name
      .toLowerCase()
      .includes(nameFilter.toLowerCase());

    const matchesFormat =
      model_format === undefined || model.model_format === model_format;
    const matchesType = model.model_type === model_type;

    if (matchesFilter && matchesFormat && matchesType) {
      filteredModels.push(model);
    }
  });
  return filteredModels;
};

const StyledModelContainer = memo((props: PropsWithChildren) => {
  return (
    <Flex flexDirection="column" gap={4} borderRadius={4} p={4} bg="base.800">
      {props.children}
    </Flex>
  );
});

StyledModelContainer.displayName = 'StyledModelContainer';

type ModelListWrapperProps = {
  title: string;
  modelList: MainModelConfigEntity[] | LoRAModelConfigEntity[];
  selected: ModelListProps;
};

const ModelListWrapper = memo((props: ModelListWrapperProps) => {
  const { title, modelList, selected } = props;
  return (
    <StyledModelContainer>
      <Flex gap={2} flexDir="column">
        <InvText variant="subtext" fontSize="sm">
          {title}
        </InvText>
        {modelList.map((model) => (
          <ModelListItem
            key={model.id}
            model={model}
            isSelected={selected.selectedModelId === model.id}
            setSelectedModelId={selected.setSelectedModelId}
          />
        ))}
      </Flex>
    </StyledModelContainer>
  );
});

ModelListWrapper.displayName = 'ModelListWrapper';

const FetchingModelsLoader = memo(
  ({ loadingMessage }: { loadingMessage?: string }) => {
    return (
      <StyledModelContainer>
        <Flex
          justifyContent="center"
          alignItems="center"
          flexDirection="column"
          p={4}
          gap={8}
        >
          <Spinner />
          <InvText variant="subtext">
            {loadingMessage ? loadingMessage : 'Fetching...'}
          </InvText>
        </Flex>
      </StyledModelContainer>
    );
  }
);

FetchingModelsLoader.displayName = 'FetchingModelsLoader';
